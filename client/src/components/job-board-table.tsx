import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type JobBoardItem = {
  id: string;
  userId: string;
  platform: string | null;
  jobTitle: string | null;
  companyName: string | null;
  jobLocation: string | null;
  jobType: string | null;
  jobDescription: string | null;
  companyLink: string | null;
  salaryRange: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobBoardResponse = {
  items: JobBoardItem[];
  page: number;
  limit: number;
  total: number;
  search?: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function JobBoardTable() {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(query.trim());
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const searchParam = debouncedSearch
    ? `&search=${encodeURIComponent(debouncedSearch)}`
    : "";

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/job-board", page, limit, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/job-board?page=${page}&limit=${limit}${searchParam}`
      );
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const rows = data?.items ?? [];

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Job Board</CardTitle>

          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="pl-8 w-[220px]"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {data?.total ?? 0} job{(data?.total ?? 0) === 1 ? "" : "s"}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : null}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="whitespace-nowrap">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading jobs…
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>No jobs found.</TableCell>
                </TableRow>
              ) : (
                rows.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {job.platform ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {job.jobTitle ?? "-"}
                    </TableCell>
                    <TableCell>{job.companyName ?? "-"}</TableCell>
                    <TableCell>{job.jobLocation ?? "-"}</TableCell>
                    <TableCell>{job.jobType ?? "-"}</TableCell>
                    <TableCell>{job.salaryRange ?? "-"}</TableCell>
                    <TableCell>
                      {job.companyLink ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(job.companyLink!, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(job.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink href="#" isActive>
                {safePage} / {totalPages}
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardContent>
    </Card>
  );
}